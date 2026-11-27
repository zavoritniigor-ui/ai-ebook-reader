package org.aiebook.reader.scanner;

import org.junit.Test;
import java.util.List;
import java.util.stream.Collectors;
import static org.junit.Assert.*;

public class ReadingOrderTest {
    private OcrWord word(String text,float x,float y,int line){return new OcrWord(text,x,y,x+60,y+20,new float[]{x,y,x+60,y,x+60,y+20,x,y+20},line);}
    @Test public void columnsReadDownBeforeAcross(){
        List<OcrWord> sorted=ReadingOrder.sort(List.of(word("right2",300,65,3),word("left1",10,30,0),word("right1",300,30,2),word("left2",10,65,1)));
        assertEquals("left1 left2 right1 right2",sorted.stream().map(w->w.text).collect(Collectors.joining(" ")));
    }
    @Test public void spanningHeadingPrecedesColumns(){
        OcrWord heading=new OcrWord("Heading",10,0,360,20,new float[]{10,0,360,0,360,20,10,20},0);
        List<OcrWord> sorted=ReadingOrder.sort(List.of(word("B",300,100,4),word("A",10,100,2),heading,word("b",300,60,3),word("a",10,60,1)));
        assertEquals("Heading a A b B",sorted.stream().map(w->w.text).collect(Collectors.joining(" ")));
    }
    @Test public void accentsRemainAndWordsInLineGoLeftToRight(){
        assertEquals("école",ReadingOrder.sort(List.of(word("cœur",100,10,0),word("école",10,10,0))).get(0).text);
    }
    @Test public void rejectsNonFiniteOrCollapsedCoordinates(){
        assertThrows(IllegalArgumentException.class,()->new OcrWord("x",Float.NaN,0,1,1,new float[8],0));
        assertThrows(IllegalArgumentException.class,()->new OcrWord("x",2,0,1,1,new float[8],0));
    }
}
